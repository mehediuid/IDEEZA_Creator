"use client";

// One Feed clip, full screen (mobile Figma "Feed · 2026 update", states 1–6
// and "Play and pause a clip"). The video fills the screen under a dark scrim
// at the top and the bottom; everything over it is the Dark semantic mode, so
// its text is white (owner rule). At the foot, the creator (A16b, • Follow),
// the Project / Product chip, the title (H6) and two lines of the description
// with "more" — the title and the description open the item's details; the
// video itself plays or pauses. Under them, the item's marketplace offers. On
// the right, the clip side nav: 3D, AR/VR, appreciate (with its count),
// comments (with theirs), share and ⋯.
//
// It plays only while it is the clip on screen (muted, looping, inline); with
// Data saver on (Settings › Appearance) it waits for a tap. A clip that can't
// load says so with Try again. 3D shows the item's 3D view over the video,
// which stays loaded under it and plays on when 3D is left.
//
// A project you shared plays its video in use from this browser's clip store
// (`takeId`); it carries no Follow, and says so when the video isn't here. A
// clip you shared to your Feed leads with "You shared" and your caption. Next
// to the Project / Product chip: the project's current Activity and Minted,
// as the web's cards show them.

import * as React from "react";
import {
  Alert02Icon,
  Blockchain01Icon,
  CommentAdd02Icon,
  FavouriteIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  Share01Icon,
  VirtualRealityVr01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { Tag } from "@/components/ideeza/tag";
import { useClipUrl } from "@/components/video-jobs/video-player";
import { formatCount } from "@/lib/feed";
import type { ClipOffer, FeedClip } from "@/lib/innovations/clips";
import { AUDIENCES } from "@/lib/innovations/feed-prefs";
import { cn } from "@/lib/utils";
import { MEDIA_INK } from "../kit/media";
import { T } from "../type";
import { ClipOffers } from "./clip-offers";

/** The clip's creator, its chips, its title and two lines of its description: the text column the
 *  Feed and AR/VR mode share. The title and the description open the item's details. */
export function ClipText({
  clip,
  following,
  onCreator,
  onFollow,
  onDetails,
}: {
  clip: FeedClip;
  following: boolean;
  onCreator: () => void;
  onFollow: () => void;
  onDetails: () => void;
}) {
  const audience = clip.share ? (AUDIENCES.find((a) => a.id === clip.share?.audience)?.label ?? "Public") : null;
  return (
    <div className="flex min-w-0 flex-col items-start gap-4">
      {clip.share && (
        <p className={cn(T.meta, MEDIA_INK, "flex max-w-full flex-col")}>
          <span>You shared · {audience}</span>
          {clip.share.caption && <span className="line-clamp-2 [overflow-wrap:anywhere]">{clip.share.caption}</span>}
        </p>
      )}
      <div className="flex max-w-full items-center gap-4">
        <button
          type="button"
          onClick={onCreator}
          className="flex min-w-0 items-center gap-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Avatar size="md" initials={clip.creator.initials} color={clip.creator.color} />
          <span className={cn(T.bodyStrong, MEDIA_INK, "truncate")}>{clip.creator.name}</span>
        </button>
        {clip.source !== "mine" && (
          <>
            <span aria-hidden className={cn(T.name, "shrink-0 text-text-disabled")}>
              •
            </span>
            <button
              type="button"
              aria-pressed={following}
              onClick={onFollow}
              className={cn(
                T.rowTitle,
                MEDIA_INK,
                "shrink-0 rounded-sm border-[length:var(--border-width-1-5)] border-solid border-[var(--color-glass-border-strong)] px-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              )}
            >
              {following ? "Following" : "Follow"}
            </button>
          </>
        )}
      </div>
      <div data-theme="light" className="flex flex-wrap items-center gap-2">
        <Tag size="md">{clip.kind === "project" ? "Project" : "Product"}</Tag>
        {clip.stage && <Tag size="md">{clip.stage}</Tag>}
        {clip.minted && <Badge tone="success">Minted</Badge>}
      </div>
      <button type="button" onClick={onDetails} className="flex flex-col gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <span className={cn(T.section, MEDIA_INK)}>{clip.title}</span>
        {clip.description && (
          <span className={cn(T.bodyLg, MEDIA_INK)}>
            {shortOf(clip.description)}
            <span className="text-text-tertiary">more</span>
          </span>
        )}
      </button>
    </div>
  );
}

export type ClipHandlers = {
  onDetails: () => void;
  onCreator: () => void;
  onFollow: () => void;
  onAppreciate: () => void;
  onComments: () => void;
  onShare: () => void;
  onMore: () => void;
  onArVr: () => void;
  onBuy: (o: ClipOffer) => void;
  /** It has been on screen a moment: count the view. */
  onSeen: () => void;
  /** The height the video really has, once known (Video quality). */
  onHeight?: (h: number) => void;
};

export type ClipState = {
  following: boolean;
  appreciated: boolean;
  appreciations: number;
  comments: number | null;
};

const SEEN_MS = 1000;
/** About two lines of Body/MD in the clip's text column. */
const SHORT_CHARS = 56;

/** The description's first two lines, then "...": "more" follows it (Figma). */
export function shortOf(text: string): string {
  const t = text.trim();
  if (t.length <= SHORT_CHARS) return `${t} `;
  const cut = t.slice(0, SHORT_CHARS);
  const space = cut.lastIndexOf(" ");
  return `${(space > 30 ? cut.slice(0, space) : cut).replace(/[,.;:]$/, "")}...`;
}

export function ClipView({
  clip,
  state,
  active,
  suspended = false,
  near,
  speed,
  dataSaver,
  handlers,
  className,
}: {
  clip: FeedClip;
  state: ClipState;
  /** The clip on screen: it plays. */
  active: boolean;
  /** A sheet is open over it: it holds still where it is. */
  suspended?: boolean;
  /** On screen or next to it: its video loads. */
  near: boolean;
  speed: number;
  dataSaver: boolean;
  handlers: ClipHandlers;
  className?: string;
}) {
  const video = React.useRef<HTMLVideoElement>(null);
  // A project you shared plays from this browser's clip store; a sample plays its file.
  const own = useClipUrl(near ? clip.takeId : null);
  const mine = clip.source === "mine";
  const src = mine ? own.url : clip.video.src;
  const poster = (mine ? own.posterUrl : null) ?? clip.poster;
  /** Your video isn't in this browser (never made here, or its file is gone). */
  const lost = mine && (clip.takeId === null || own.state === "lost");
  // Tapped to pause (or, with Data saver, not yet tapped to play).
  const [paused, setPaused] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [flash, setFlash] = React.useState<"play" | "pause" | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [waiting, setWaiting] = React.useState(false);
  const [model, setModel] = React.useState(false);

  // Leaving the screen starts the clip afresh next time (adjusted while rendering, not in an effect).
  const [wasActive, setWasActive] = React.useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setPaused(false);
      setStarted(false);
      setModel(false);
    }
  }

  const waitsForTap = dataSaver && !started;
  const playing = active && !suspended && !paused && !waitsForTap && !model && !failed && !lost;

  React.useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.playbackRate = speed;
    if (playing) {
      // Only a browser that refuses to start it needs a tap; a play() cut short by a pause, a
      // new source or a reload (AbortError) is not the viewer pausing.
      v.play().catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "NotAllowedError") setPaused(true);
      });
    } else v.pause();
  }, [playing, speed, near, src]);

  const seen = React.useRef(handlers.onSeen);
  React.useEffect(() => {
    seen.current = handlers.onSeen;
  }, [handlers.onSeen]);
  React.useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => seen.current(), SEEN_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  React.useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 700);
    return () => window.clearTimeout(id);
  }, [flash]);

  const toggle = () => {
    if (model || failed || lost) return;
    if (waitsForTap) {
      setStarted(true);
      setPaused(false);
      setFlash("play");
      return;
    }
    setPaused((p) => !p);
    setFlash(paused ? "play" : "pause");
  };

  const retry = () => {
    setFailed(false);
    video.current?.load();
  };

  const showPlay = active && !model && !failed && !lost && (paused || waitsForTap);
  const centre = showPlay ? "play" : flash;

  return (
    <article aria-label={`${clip.kind === "project" ? "Project" : "Product"}: ${clip.title}`} className={cn("relative h-full w-full overflow-hidden bg-[var(--color-black)]", className)}>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- the clip's still, under the video while it loads
        <img src={poster} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {near && src && (
        <video
          ref={video}
          src={src}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          preload={active && !dataSaver ? "auto" : "metadata"}
          aria-label={clip.video.label}
          aria-hidden={model || undefined}
          onLoadedMetadata={(e) => handlers.onHeight?.(e.currentTarget.videoHeight)}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {model && <ModelView clip={clip} poster={poster} />}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[140px] bg-gradient-to-b from-[color:color-mix(in_srgb,var(--color-black)_70%,transparent)] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-b from-transparent from-[14%] to-[color:color-mix(in_srgb,var(--color-black)_70%,transparent)]" />

      <button
        type="button"
        aria-label={model ? "3D view" : playing ? "Pause" : "Play"}
        disabled={model || failed || lost}
        onClick={toggle}
        className="absolute inset-0 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
      />

      <div data-theme="dark" className="pointer-events-none absolute inset-0 flex flex-col justify-end text-text-primary">
        {centre && (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 inline-flex size-[48px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-glass-fill-sm)] text-[color:var(--color-white)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-fast"
          >
            <Icon icon={centre === "play" ? PlayIcon : PauseIcon} size={24} />
          </span>
        )}
        {waiting && playing && (
          <span role="status" aria-label="Loading the clip" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Spinner size={32} />
          </span>
        )}
        {failed && !model && (
          <div className="pointer-events-auto absolute inset-x-8 top-1/2 flex -translate-y-1/2 flex-col items-center gap-6 text-center">
            <span className="text-[color:var(--color-icon-error)]">
              <Icon icon={Alert02Icon} size={32} />
            </span>
            <p className={cn(T.display, MEDIA_INK)}>Couldn’t play this clip</p>
            <Button hierarchy="secondary" size="xl" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
        {lost && !model && (
          <div role="status" className="absolute inset-x-8 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4 text-center">
            <span className={MEDIA_INK}>
              <Icon icon={Alert02Icon} size={32} />
            </span>
            <p className={cn(T.display, MEDIA_INK)}>This video isn’t in this browser</p>
            <p className={cn(T.body, MEDIA_INK)}>It plays where it was made. Your post is still on the Feed.</p>
          </div>
        )}

        <div className="flex items-end gap-6 px-8 pb-6">
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-8">
            <ClipText clip={clip} following={state.following} onCreator={handlers.onCreator} onFollow={handlers.onFollow} onDetails={handlers.onDetails} />
            <ClipOffers offers={clip.offers} onBuy={handlers.onBuy} />
          </div>

          <nav aria-label="Clip actions" className="pointer-events-auto flex w-[44px] shrink-0 flex-col items-center gap-4">
            <SideButton icon={Blockchain01Icon} label="3D" pressed={model} on={model} onClick={() => setModel((m) => !m)} />
            <SideButton icon={VirtualRealityVr01Icon} label="AR/VR" onClick={handlers.onArVr} />
            <SideButton
              icon={FavouriteIcon}
              label={formatCount(state.appreciations)}
              name={state.appreciated ? "Appreciated" : "Appreciate"}
              pressed={state.appreciated}
              filled={state.appreciated}
              onClick={handlers.onAppreciate}
            />
            <SideButton
              icon={CommentAdd02Icon}
              label={state.comments === null ? "" : formatCount(state.comments)}
              name={state.comments === null ? "Comments" : `Comments, ${state.comments}`}
              onClick={handlers.onComments}
            />
            <SideButton icon={Share01Icon} name="Share to your Feed" onClick={handlers.onShare} />
            <SideButton icon={MoreHorizontalIcon} name="More" onClick={handlers.onMore} />
          </nav>
        </div>
      </div>
    </article>
  );
}

function SideButton({
  icon,
  label,
  name,
  pressed,
  filled,
  on,
  onClick,
}: {
  icon: IconValue;
  label?: string;
  name?: string;
  pressed?: boolean;
  filled?: boolean;
  /** Drawn as switched on (3D): the glass fill behind it, so it reads as the way back too. */
  on?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={name ?? label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] w-[44px] flex-col items-center justify-center gap-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        on && "bg-[var(--color-glass-fill-sm)]",
      )}
    >
      <span className={cn(filled ? "text-[color:var(--color-icon-error)] [&_path]:fill-current" : MEDIA_INK)}>
        <Icon icon={icon} size={24} />
      </span>
      {label && <span className={cn(T.body, MEDIA_INK, "whitespace-nowrap")}>{label}</span>}
    </button>
  );
}

/** "3D view mode" (Clip ⋯ menu 03): the item's model over its video. A Feed post has no 3D file
 *  here (the web's words), so this is its render, on the light stage the Figma draws. */
function ModelView({ clip, poster }: { clip: FeedClip; poster: string | null }) {
  return (
    <div data-theme="light" className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[var(--color-white)] to-[var(--color-gray-300)]">
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element -- the item's render
        <img src={poster} alt={`${clip.title}, its render`} className="max-h-[50%] w-full object-contain px-12" />
      )}
      <p className={cn(T.body, "absolute inset-x-8 top-[120px] rounded-md bg-[var(--color-glass-fill-lg)] px-6 py-4 text-center text-text-primary")}>
        {clip.source === "mine" ? "This is its picture. Open the project for its 3D model." : "This sample post has no 3D file; this is its render."} Tap 3D again for the video.
      </p>
    </div>
  );
}
