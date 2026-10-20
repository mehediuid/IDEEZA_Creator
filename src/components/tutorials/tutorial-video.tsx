"use client";

// A tutorial video and its reward (Figma "Thumbnil" 38577:5768; Claim 38577:5849;
// Claimed 38577:6123; plan § Reward logic). The card: the video, then the footer
// "See this video and earn IDZ Token" with the reward's state on the right:
//
//   coming soon → no file yet (D1): the poster, "Video coming soon", no reward
//   earn        → "Earn: 2.0 IDZ Token"
//   watching    → the same, over a progress line: "n% watched · watch to the end to earn"
//   ready       → "Claim 2.0 IDZ Token" (DS Button)
//   claiming    → the button busy, for the demo chain's short confirmation
//   claimed     → "✓ Claimed" (DS Badge success)
//
// Playback counts only while it really plays (`tickSpan`): a seek starts a new
// stretch and a replayed part counts once, so the reward can't be skipped to.
// Played stretches are saved every few seconds, on pause and on leaving, so a
// reload keeps the place. Claim pays the maker's chosen demo account; with no
// account connected it opens the Demo wallet dialog and finishes the claim as
// soon as one connects (D6).

import * as React from "react";
import { Clock01Icon, PlayIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ProgressBar } from "@/components/ideeza";
import { persistWallet, useWalletRequest } from "@/components/wallet/wallet-provider";
import { formatIdz } from "@/lib/tutorials/catalog";
import { addSpan, rewardStateOf, tickSpan, watchedShare, type Span, type TutorialProgress } from "@/lib/tutorials/progress";
import { claimReward, payeeOf } from "@/lib/tutorials/reward";
import type { TutorialVideo as Video } from "@/lib/tutorials/types";
import { updateProgress } from "@/lib/tutorials/use-progress";
import { TIMING } from "@/lib/wallet/request";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";

const POSTER = "/tutorials/video-poster.jpg";
/** How often played stretches are saved while the video plays. */
const SAVE_EVERY_MS = 5000;
const CLAIMED_LINE = (amount: string) => `${formatIdz(amount)} IDZ added to your demo wallet.`;

function merge(stored: readonly Span[] | undefined, live: readonly Span[]): Span[] {
  return live.reduce<Span[]>((acc, [a, b]) => addSpan(acc, a, b), [...(stored ?? [])]);
}

/** Saves what has played so far, and the video's length. */
function save(videoId: string, live: readonly Span[], duration: number | null) {
  if (!live.length && !duration) return;
  updateProgress((p) => ({
    ...p,
    watched: live.length ? { ...p.watched, [videoId]: merge(p.watched[videoId], live) } : p.watched,
    duration: duration ? { ...p.duration, [videoId]: duration } : p.duration,
  }));
}

type ClaimPhase = "idle" | "claiming" | "awaitWallet" | "failed";

function useClaim(video: Video, progress: TutorialProgress | undefined) {
  const { openManage } = useWalletRequest();
  const wallet = useDemoWallet();
  const [phase, setPhase] = React.useState<ClaimPhase>("idle");
  const [justClaimed, setJustClaimed] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const record = React.useCallback(
    (activityId: string, at: number) =>
      updateProgress((p) => ({ ...p, claimed: { ...p.claimed, [video.id]: { at, amount: video.reward, activityId } } })),
    [video.id, video.reward],
  );

  const claim = React.useCallback(() => {
    if (!progress) return;
    const first = claimReward(readWallet(), progress, video, Date.now());
    if (!first.ok) {
      if (first.reason === "noWallet") {
        setPhase("awaitWallet");
        openManage();
      } else if (first.reason === "already") {
        record(first.entry.id, first.entry.at);
        setPhase("idle");
      }
      return;
    }
    setPhase("claiming");
    timer.current = window.setTimeout(() => {
      timer.current = null;
      // Read again at the moment of paying: the wallet may have changed meanwhile.
      const at = Date.now();
      const r = claimReward(readWallet(), progress, video, at);
      if (!r.ok) {
        if (r.reason === "already") record(r.entry.id, r.entry.at);
        setPhase(r.reason === "already" ? "idle" : "failed");
        return;
      }
      if (!persistWallet(r.wallet)) {
        setPhase("failed");
        return;
      }
      record(r.entry.id, at);
      setJustClaimed(true);
      setPhase("idle");
    }, TIMING.connect);
  }, [progress, video, openManage, record]);

  // The claim waits for a wallet: it goes through once the chosen account is connected.
  React.useEffect(() => {
    if (phase !== "awaitWallet" || !wallet || !payeeOf(wallet)) return;
    const t = window.setTimeout(claim, 0);
    return () => window.clearTimeout(t);
  }, [phase, wallet, claim]);

  return { phase, claim, justClaimed };
}

function ComingSoon() {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-bg-overlay">
      <img src={POSTER} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-text-on-brand">
        <Icon icon={Clock01Icon} size={24} />
        <p className="m-0 text-lg font-semibold leading-lg">Video coming soon</p>
      </div>
    </div>
  );
}

function Player({ video, onTick, onDuration, onStop }: { video: Video; onTick: (s: Span) => void; onDuration: (d: number) => void; onStop: () => void }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const last = React.useRef<number | null>(null);
  const [started, setStarted] = React.useState(false);
  const [broken, setBroken] = React.useState(false);

  const reportDuration = (v: HTMLVideoElement) => {
    if (Number.isFinite(v.duration) && v.duration > 0) onDuration(v.duration);
  };
  // The server drew the <video>, so its metadata may have loaded before this handler was attached.
  React.useEffect(() => {
    const v = ref.current;
    if (v && v.readyState >= 1) reportDuration(v);
    // Once, on mount: later loads reach onLoadedMetadata.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    setStarted(true);
    v.play().catch(() => undefined);
    v.focus();
  };

  if (broken) {
    return (
      <div role="alert" className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg bg-bg-subtle px-8 text-center">
        <p className="m-0 text-md leading-md text-text-primary">This video can&apos;t play in this browser. Try again later.</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-bg-overlay">
      <video
        ref={ref}
        src={video.src}
        poster={video.poster ?? POSTER}
        controls
        preload="metadata"
        playsInline
        aria-label={video.title}
        // Behind the Play button it would be a hidden Tab stop; it joins the order once started.
        tabIndex={started ? 0 : -1}
        onLoadedMetadata={(e) => reportDuration(e.currentTarget)}
        onDurationChange={(e) => reportDuration(e.currentTarget)}
        onPlay={(e) => {
          setStarted(true);
          reportDuration(e.currentTarget);
          last.current = e.currentTarget.currentTime;
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (last.current !== null && !v.paused) {
            const span = tickSpan(last.current, v.currentTime, v.seeking);
            if (span) onTick(span);
          }
          last.current = v.currentTime;
        }}
        onSeeking={() => {
          last.current = null;
        }}
        onSeeked={(e) => {
          last.current = e.currentTarget.currentTime;
        }}
        onPause={onStop}
        onEnded={onStop}
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-contain outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
      />
      {!started && (
        <button type="button" onClick={play} aria-label={`Play ${video.title}`} className="group absolute inset-0 flex cursor-pointer items-center justify-center outline-none">
          <span className="inline-flex size-[56px] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-bg-overlay)_72%,transparent)] text-text-on-brand shadow-3 transition-transform duration-fast ease-decelerate group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-border-focus group-focus-visible:ring-offset-2 motion-reduce:transition-none">
            <Icon icon={PlayIcon} size={26} />
          </span>
        </button>
      )}
    </div>
  );
}

export function TutorialVideo({ video, progress }: { video: Video; progress: TutorialProgress | undefined }) {
  const [live, setLive] = React.useState<Span[]>([]);
  const liveRef = React.useRef<Span[]>([]);
  const durationRef = React.useRef<number | null>(null);
  const { phase, claim, justClaimed } = useClaim(video, progress);

  const flush = React.useCallback(() => {
    const spans = liveRef.current;
    const duration = durationRef.current;
    liveRef.current = [];
    durationRef.current = null;
    save(video.id, spans, duration);
    setLive([]);
  }, [video.id]);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      if (liveRef.current.length) flush();
    }, SAVE_EVERY_MS);
    return () => {
      window.clearInterval(t);
      flush();
    };
  }, [flush]);

  const onTick = React.useCallback((s: Span) => {
    liveRef.current = addSpan(liveRef.current, s[0], s[1]);
    setLive(liveRef.current);
  }, []);
  const onDuration = React.useCallback(
    (d: number) => {
      if (progress?.duration[video.id] === d) return;
      durationRef.current = d;
      flush();
    },
    [progress, video.id, flush],
  );

  // The record as saved, plus what has played since the last save.
  const view = React.useMemo<TutorialProgress | undefined>(
    () => (progress && live.length ? { ...progress, watched: { ...progress.watched, [video.id]: merge(progress.watched[video.id], live) } } : progress),
    [progress, live, video.id],
  );
  const state = view ? rewardStateOf(view, video) : video.src ? "earn" : "soon";
  const share = view ? watchedShare(view, video.id) : 0;
  const amount = formatIdz(video.reward);

  return (
    <figure className="m-0 flex flex-col gap-8 rounded-xl border border-solid border-border-subtle bg-bg-surface p-8 shadow-1">
      {video.src ? <Player video={video} onTick={onTick} onDuration={onDuration} onStop={flush} /> : <ComingSoon />}
      <figcaption className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="m-0 min-w-0 flex-1 text-md font-semibold leading-md text-text-primary">
            {state === "soon" ? video.title : "See this video and earn IDZ Token"}
          </p>
          {(state === "earn" || state === "watching") && (
            <p className="m-0 shrink-0 whitespace-nowrap text-md font-semibold leading-md text-text-brand">Earn: {amount} IDZ Token</p>
          )}
          {state === "ready" && (
            <Button hierarchy="primary" size="sm" loading={phase === "claiming"} onClick={claim} className="shrink-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)]">
              Claim {amount} IDZ Token
            </Button>
          )}
          {state === "claimed" && (
            <Badge tone="success" className="inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-semibold leading-xs">
              <Icon icon={Tick02Icon} size={16} />
              Claimed
            </Badge>
          )}
        </div>
        {state === "watching" && (
          <div className="flex flex-col gap-2">
            <ProgressBar value={share * 100} label={`${video.title}: watched`} />
            <p className="m-0 text-sm leading-sm text-text-secondary">
              {Math.floor(share * 100)}% watched · watch to the end to earn {amount} IDZ
            </p>
          </div>
        )}
        {/* Always in the page, so a screen reader hears what lands in it; empty, it takes no room. */}
        <p role="status" className={cn("m-0 text-sm leading-sm empty:-mt-4", phase === "failed" ? "text-text-error" : "text-text-secondary")}>
          {phase === "failed"
            ? "Couldn't add the tokens to your demo wallet. Try again."
            : phase === "awaitWallet"
              ? "Connect your demo wallet to receive the IDZ. The claim finishes as soon as it's connected."
              : state === "claimed" && justClaimed
                ? CLAIMED_LINE(video.reward)
                : ""}
        </p>
      </figcaption>
    </figure>
  );
}
