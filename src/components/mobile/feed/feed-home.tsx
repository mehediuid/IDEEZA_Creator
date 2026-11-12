"use client";

// Home = the Feed (mobile Figma "Feed · 2026 update" 10646:2; owner rules:
// no Innovations on the phone, Home is full-screen clips of the projects and
// products shared on the marketplace, a clip's title opens its details). The
// top nav and the queue pill float over the clips; Feed and Following are two
// orders of the same clips (`?tab=following` keeps the choice in the address;
// a tap switches at once, with no trip to the server).
//
// The Feed leads with what you shared: the clips you shared to your Feed (with
// your caption), then your own projects shared to the Feed (the web's "Shared
// by you"), then everyone's clips in the Feed's order. The order is taken when
// a tab opens, and again when what you share changes, so a clip never jumps
// while it is watched; what the ⋯ menu takes away (Hide video, Not interested)
// leaves at once. Back from a clip's details returns to that clip. States: the
// bones while the stores are read, Following with nobody followed (Search
// People), everything hidden (show them again), offline. A new account follows
// no one until it chooses to (the sample dataset's follows are the web's
// demo, not the phone account's). After a skipped "Where did you hear about
// IDEEZA?", the web's "Finish your profile" card shows under the top nav.

import * as React from "react";
import { Search01Icon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ideeza/skeleton";
import { FEED_CLIPS, feedClips, followingClips, type FeedClip } from "@/lib/innovations/clips";
import { useReactions } from "@/lib/innovations/reactions";
import { EmptyState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { useTabParam } from "../kit/tabs";
import { StatusBar } from "../status-bar";
import { ClipDeck } from "./clip-deck";
import { FeedTopNav, QueuePill, type FeedTab } from "./feed-chrome";
import { useMineClips } from "./use-clips";
import { useFeedPrefs } from "./use-feed";
import { useGuestGuard } from "./use-guest";
import { SourceNudge } from "@/components/auth/source-picker";

const TABS = ["feed", "following"] as const;
const NO_HIDDEN = { interested: [], notInterested: [], hidden: [] };

export function FeedHome() {
  const [tab, setTab] = useTabParam<FeedTab>("tab", TABS, "feed");
  const { guard, gate } = useGuestGuard();
  const { hydrated: reactionsRead, reactions } = useReactions();
  const { hydrated: prefsRead, prefs, update } = useFeedPrefs();
  const { hydrated: mineRead, clips: mine } = useMineClips();
  const ready = reactionsRead && prefsRead && mineRead;

  // Every clip of the tab as it reads now (your shares carry your caption).
  const live = React.useMemo(
    () => (tab === "following" ? followingClips(FEED_CLIPS, reactions, undefined, false) : feedClips(FEED_CLIPS, mine, prefs.shares, NO_HIDDEN)),
    [tab, reactions, mine, prefs.shares],
  );
  // The order, taken once per tab — and again when what you shared changes.
  const sig = tab === "feed" ? `${prefs.shares.map((s) => s.id).join(",")}|${mine.map((c) => c.id).join(",")}` : "";
  const [order, setOrder] = React.useState<{ tab: FeedTab; sig: string; ids: string[] } | null>(null);
  if (ready && (order?.tab !== tab || order.sig !== sig)) {
    const list = tab === "following" ? followingClips(FEED_CLIPS, reactions, prefs, false) : feedClips(FEED_CLIPS, mine, prefs.shares, prefs);
    setOrder({ tab, sig, ids: list.map((c) => c.id) });
  }
  const gone = React.useMemo(() => new Set([...prefs.hidden, ...(tab === "feed" ? prefs.notInterested : [])]), [prefs, tab]);
  const clips = React.useMemo<FeedClip[]>(() => {
    if (!order) return [];
    const byId = new Map(live.map((c) => [c.id, c]));
    return order.ids.map((id) => byId.get(id)).filter((c): c is FeedClip => !!c && !gone.has(c.id));
  }, [order, live, gone]);

  const empty =
    !ready || !order ? null : tab === "following" && order.ids.length === 0 ? (
      <EmptyState
        className="border-0 bg-transparent"
        icon={Search01Icon}
        title="You’re not following anyone yet"
        body="Clips from the creators you follow show up here."
        action={{ label: "Search People", href: "/m/search?kind=people" }}
      />
    ) : clips.length === 0 ? (
      <EmptyState
        className="border-0 bg-transparent"
        icon={ViewOffSlashIcon}
        title="You’ve hidden every clip here"
        body="Show them again to keep watching."
        action={{
          label: "Show hidden clips",
          onClick: () => {
            update((p) => ({ ...p, hidden: [], notInterested: [] }));
            setOrder(null);
          },
        }}
      />
    ) : null;

  return (
    <div data-theme="dark" className="relative h-full overflow-hidden bg-bg-page text-text-primary">
      {!ready || !order ? (
        <FeedBones />
      ) : empty ? (
        <div className="flex h-full items-center px-8 pt-[110px]">{empty}</div>
      ) : (
        <ClipDeck key={tab} clips={clips} guard={guard} restoreKey={tab} />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col">
        <StatusBar tone="media" />
        <div className="pointer-events-auto">
          <FeedTopNav tab={tab} onTab={setTab} guard={guard} />
        </div>
        <div className="pointer-events-auto">
          <QueuePill />
        </div>
        <div className="pointer-events-auto px-8 pt-4">
          <OfflineBanner />
        </div>
        {/* The web's "Finish your profile" after a skipped question (Home's SourceNudge): never forced, closes for good. */}
        <div data-theme="light" className="pointer-events-auto px-8 pt-4 empty:hidden">
          <SourceNudge />
        </div>
      </div>
      {gate}
    </div>
  );
}

/** The Feed loading: the clip's text column and side nav as bones on the dark stage. */
function FeedBones() {
  return (
    <div role="status" aria-label="Loading the Feed" className="flex h-full items-end gap-6 px-8 pb-6">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-6">
          <Skeleton shape="circle" size="md" />
          <Skeleton shape="text" size="md" />
        </div>
        <Skeleton shape="text" size="lg" />
        <Skeleton shape="text" size="md" />
        <Skeleton shape="block" className="h-[96px] w-full" />
      </div>
      <div className="flex flex-col gap-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} shape="circle" size="sm" />
        ))}
      </div>
    </div>
  );
}
