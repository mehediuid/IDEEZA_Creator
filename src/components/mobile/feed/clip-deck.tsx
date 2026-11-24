"use client";

// Clips stacked one per screen, scrolled a screen at a time (the Feed, and a
// single clip on its own page), with everything a clip's buttons open: the
// comments, sharing to your Feed and the ⋯ menu. The clip on screen plays;
// the ones beside it load. Each clip reads its heart, count and comments from
// the web's stores (reactions.ts, comments-store.ts), so they agree with the
// web's post page. Your own clip's Share opens your project's share, never the
// re-share of others' items (SOC-13).
//
// The deck remembers the clip on screen (`restoreKey`, for this tab's session),
// so Back from a clip's details returns to that clip, not to the first one.
// When the list is put in a new order under it (a clip you just shared moves
// to the front), the clip being watched stays on screen. Playback speed is
// kept with the Feed's choices; Data saver is Settings › Appearance's.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useReactions, countsOf, follows } from "@/lib/innovations/reactions";
import { clipBuyHref, clipDetailsHref, type FeedClip } from "@/lib/innovations/clips";
import { useCommentCount } from "@/lib/innovations/comments-store";
import { sampleSeedOf } from "@/lib/innovations/sample-posts";
import { profileHrefOf } from "@/lib/people/ids";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { useToast } from "../kit/toast";
import { ClipComments } from "./clip-comments";
import { ClipMenu, OwnClipShare } from "./clip-menu";
import { ClipShare, shareTargetOfClip } from "./clip-share";
import { ClipView } from "./clip-view";
import { useFeedPrefs } from "./use-feed";
import type { Guard } from "./use-guest";

type Open = { kind: "comments" | "share" | "menu"; clipId: string } | null;

const AT_KEY = (key: string) => `ideeza:m:feed:at:${key}`;

function readAt(key: string | undefined): string | null {
  if (!key) return null;
  try {
    return window.sessionStorage.getItem(AT_KEY(key));
  } catch {
    return null;
  }
}

/** Opens the Feed on this clip the next time it shows (after "Share to your Feed" › View). */
export function rememberFeedClip(clipId: string): void {
  try {
    window.sessionStorage.setItem(AT_KEY("feed"), clipId);
  } catch {
    // Storage refused: the Feed opens at its first clip.
  }
}

export function ClipDeck({
  clips,
  guard,
  className,
  startWithComments = false,
  focusComment = null,
  restoreKey,
}: {
  clips: readonly FeedClip[];
  guard: Guard;
  className?: string;
  /** Opens the first clip's comments on arrival (a copied comment link). */
  startWithComments?: boolean;
  /** The comment that link names: its thread opens and it is brought into view. */
  focusComment?: string | null;
  /** Remembers the clip on screen under this name ("feed", "following"). */
  restoreKey?: string;
}) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(() => {
    const kept = readAt(restoreKey);
    return kept && clips.some((c) => c.id === kept) ? kept : (clips[0]?.id ?? null);
  });
  const [open, setOpen] = React.useState<Open>(startWithComments && clips[0] ? { kind: "comments", clipId: clips[0].id } : null);
  // The clip whose sheets are mounted: kept after its menu closes, so a sheet the menu opened
  // (speed, quality, report) stays up.
  const [target, setTarget] = React.useState<string | null>(open?.clipId ?? null);
  const [heights, setHeights] = React.useState<Record<string, number>>({});
  const { prefs } = useFeedPrefs();
  const dataSaver = useSettings().appearance.dataSaver;

  // A clip that left the list (hidden, not interested) hands the screen to the one now there.
  const current = clips.some((c) => c.id === activeId) ? activeId : (clips[0]?.id ?? null);
  const at = clips.findIndex((c) => c.id === current);
  const openClip = target ? (clips.find((c) => c.id === target) ?? null) : null;

  // The clip on screen stays on screen: on arrival (the one remembered) and when the list is
  // reordered under it. Only the order matters here; scrolling itself moves `current`.
  const order = clips.map((c) => c.id).join("|");
  const currentRef = React.useRef(current);
  React.useLayoutEffect(() => {
    currentRef.current = current;
  });
  React.useLayoutEffect(() => {
    const root = scroller.current;
    const id = currentRef.current;
    if (!root || !id) return;
    const el = root.querySelector<HTMLElement>(`[data-clip="${CSS.escape(id)}"]`);
    if (el && Math.abs(root.scrollTop - el.offsetTop) > 1) root.scrollTop = el.offsetTop;
  }, [order]);

  // The clip that fills most of the screen is the one on screen.
  React.useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId((e.target as HTMLElement).dataset.clip ?? null);
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll<HTMLElement>("[data-clip]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [order]);

  React.useEffect(() => {
    if (!restoreKey || !current) return;
    try {
      window.sessionStorage.setItem(AT_KEY(restoreKey), current);
    } catch {
      // Storage refused: Back returns to the first clip.
    }
  }, [restoreKey, current]);

  return (
    <div ref={scroller} className={cn("h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {clips.map((c, i) => (
        <div key={c.id} data-clip={c.id} className="h-full snap-start snap-always">
          <WiredClip
            clip={c}
            active={c.id === current}
            suspended={!!open}
            near={Math.abs(i - at) <= 1}
            speed={prefs.speed}
            dataSaver={dataSaver}
            guard={guard}
            onOpen={(kind) => {
              setTarget(c.id);
              setOpen({ kind, clipId: c.id });
            }}
            onHeight={(h) => setHeights((m) => (m[c.id] === h ? m : { ...m, [c.id]: h }))}
          />
        </div>
      ))}
      {openClip && (
        <>
          <ClipComments
            clip={openClip}
            open={open?.kind === "comments"}
            onClose={() => setOpen(null)}
            guard={guard}
            focusId={startWithComments && openClip.id === clips[0]?.id ? focusComment : null}
          />
          {openClip.source === "mine" ? (
            <OwnClipShare clip={openClip} open={open?.kind === "share"} onClose={() => setOpen(null)} />
          ) : (
            <ClipShare item={shareTargetOfClip(openClip)} open={open?.kind === "share"} onClose={() => setOpen(null)} onFeed={restoreKey === "feed"} />
          )}
          <ClipMenu clip={openClip} open={open?.kind === "menu"} onClose={() => setOpen(null)} height={heights[openClip.id] ?? null} guard={guard} />
        </>
      )}
    </div>
  );
}

function WiredClip({
  clip,
  active,
  suspended,
  near,
  speed,
  dataSaver,
  guard,
  onOpen,
  onHeight,
}: {
  clip: FeedClip;
  active: boolean;
  suspended: boolean;
  near: boolean;
  speed: number;
  dataSaver: boolean;
  guard: Guard;
  onOpen: (kind: "comments" | "share" | "menu") => void;
  onHeight: (h: number) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { reactions, toggle, markViewed, setFollow } = useReactions();
  const comments = useCommentCount(clip.postId, sampleSeedOf(clip.postId));
  const counts = countsOf(reactions, clip.postId, clip.base);
  // The web's rule (person-actions): your own choice, else the sample dataset's — as the profile says.
  const following = follows(reactions, clip.creator.id, clip.followedByDataset);
  const failed = () => toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
  const go = (title: string, href: string) => guard(title, () => router.push(href), href);

  // Your own clip opens your own profile.
  const creatorHref = clip.source === "mine" ? "/profile" : profileHrefOf(clip.creator.id, "innovations");
  const handlers = {
    onDetails: () => go(clip.kind === "project" ? "Log In to see this project" : "Log In to see this product", clipDetailsHref(clip)),
    onCreator: () => {
      if (creatorHref) go(`Log In to see ${clip.creator.name}’s profile`, `/m${creatorHref}`);
    },
    onFollow: () =>
      guard(`Log In to follow ${clip.creator.name}`, () => {
        if (!setFollow(clip.creator.id, !following)) failed();
      }),
    onAppreciate: () =>
      guard("Log In to appreciate this", () => {
        if (!toggle("appreciated", clip.postId)) failed();
      }),
    onComments: () => onOpen("comments"),
    onShare: () => guard("Log In to share this video", () => onOpen("share")),
    onMore: () => onOpen("menu"),
    onArVr: () => go("Log In to view it in AR/VR", `/m/clip/${encodeURIComponent(clip.id)}/ar`),
    onBuy: () => go("Log In to buy", clipBuyHref(clip)),
    onSeen: () => markViewed(clip.postId),
    onHeight,
  };

  return (
    <ClipView
      clip={clip}
      state={{ following, appreciated: counts.appreciated, appreciations: counts.appreciations, comments }}
      active={active}
      suspended={suspended}
      near={near}
      speed={speed}
      dataSaver={dataSaver}
      handlers={handlers}
    />
  );
}
