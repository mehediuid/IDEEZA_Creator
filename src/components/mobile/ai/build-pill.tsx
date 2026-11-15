"use client";

// Build queue popups (10706:6681, 01–06): a build keeps running while the
// maker is elsewhere, and a slim bar under the top bar says where it is —
// queued (and how many are ahead), starting, building with its percentage
// and time left, then ready to review, needing a retry, stopped or paused.
// The words are the web's (attention-banner.tsx), worked out by `pillOf`.
// A running build's pill stays while it runs; the rest stay, as the web's
// banner does, until tapped or dismissed (✕), and follow Settings ›
// Notifications (quiet hours, a muted project, Builds off). Tapping opens the
// build's chat; on that chat the pill says nothing, since the build is
// already in front of the maker.
//
// It never covers the screen (mobile UX lens 13): it docks into the screen's
// top dock slot (Screen draws one under its header, kit/dock.tsx), in the
// layout flow, so the content starts under it. Only the Feed, whose clips run
// full-bleed under its header, floats it there until it draws a slot of its own.

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { allItems, productsOf, queuedAhead, statusOf, useCreateHistory, ITEM_LABELS, type BuildJob } from "@/lib/create/history";
import { chainSeconds, choiceOfItem, pieceSeconds } from "@/lib/create/pieces";
import { pillOf, type Pill } from "@/lib/mobile-ai/flow";
import { buildNotices } from "@/lib/notifications/sources";
import { useToastGate } from "@/components/notifications/use-notices";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useFramed } from "../device";
import { useDockSlot } from "../kit/dock";
import { Chevron } from "../kit/list";
import { PRESSED } from "../kit/press";

/** Under this long since it started, a running build is "just started". */
const STARTING_MS = 4_000;

/** Seconds the slowest product still needs, from each piece's own estimate. */
export function secondsLeftOf(job: BuildJob): number {
  let most = 0;
  for (const p of productsOf(job)) {
    const sec: Partial<Record<(typeof p.items)[number]["kind"], number>> = {};
    for (const it of p.items) {
      if (it.status !== "building" && it.status !== "pending") continue;
      sec[it.kind] = pieceSeconds(it.kind, choiceOfItem(it)) * (1 - it.progress / 100);
    }
    most = Math.max(most, chainSeconds(sec));
  }
  return Math.round(most);
}

function failedNames(job: BuildJob): string[] {
  const products = productsOf(job);
  const multi = products.length > 1;
  return products.flatMap((p) =>
    p.items.filter((i) => i.status === "failed").map((i) => (multi ? `${p.name} ${ITEM_LABELS[i.kind]}` : ITEM_LABELS[i.kind])),
  );
}

export function pillForJob(job: BuildJob, builds: BuildJob[], now: number): Pill | null {
  const status = statusOf(job);
  const live = allItems(job).filter((i) => i.status !== "skipped");
  const percent = live.length ? live.reduce((s, i) => s + i.progress, 0) / live.length : 0;
  return pillOf({
    status,
    name: job.projectChoiceName?.trim() || job.title,
    ahead: queuedAhead(job, builds),
    percent,
    secondsLeft: secondsLeftOf(job),
    justStarted: !!job.startedAt && now - job.startedAt < STARTING_MS,
    blocked: job.blocked,
    systemFailure: job.failure === "system",
    refunded: job.creditsRefunded,
    failed: failedNames(job),
    saved: !!job.projectId,
  });
}

// How many build pills are on screen now: the build watcher (build-watcher.tsx) says a build's
// news in a toast only where no pill can (off the tabs).
let pillsMounted = 0;
export function pillOnScreen(): boolean {
  return pillsMounted > 0;
}

export function BuildPill() {
  const { hydrated, builds, attentionBuilds, dismissAttention, getChat } = useCreateHistory();
  const allowed = useToastGate();
  const pathname = usePathname();
  const router = useRouter();
  const framed = useFramed();
  const slot = useDockSlot("top");
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    pillsMounted += 1;
    return () => {
      pillsMounted -= 1;
    };
  }, []);
  // The building one first; else the newest that still asks for the maker (not dismissed, and
  // allowed by Settings › Notifications — quiet hours, a muted project, Builds off: the web's gate).
  const job = React.useMemo(() => {
    const sorted = [...builds].sort((a, b) => b.updatedAt - a.updatedAt);
    const running = sorted.find((b) => ["queued", "running"].includes(statusOf(b)) && !b.blocked);
    if (running) return running;
    const att = attentionBuilds
      .filter((a) => !a.job.attentionDismissedAt && allowed(buildNotices([a], (id) => !!getChat(id))[0]))
      .sort((a, b) => b.job.updatedAt - a.job.updatedAt)[0];
    return att?.job ?? null;
  }, [builds, attentionBuilds, allowed, getChat]);
  const pill = job ? pillForJob(job, builds, now) : null;

  // Ticks while a lasting pill shows, so "about 2 min left" moves on its own.
  const lasting = !!pill?.lasting;
  React.useEffect(() => {
    if (!lasting) return;
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [lasting]);

  if (!hydrated || !job || !pill) return null;
  if (pathname === `/m/ai/chat/${job.chatId}`) return null;
  // Home's Feed draws its own queue pill (Feed "Popup when user is in queue").
  if (pathname === "/m" && statusOf(job) === "queued") return null;

  const glyph = pill.tone === "done" ? CheckmarkCircle02Icon : pill.tone === "working" ? Loading03Icon : Alert02Icon;
  const ink = pill.tone === "error" ? "text-text-error" : "text-text-primary";
  const open = () => {
    // What happened is now in front of the maker: it doesn't ask again (a running build keeps its pill).
    if (!pill.lasting) dismissAttention(job.id);
    router.push(`/m/ai/chat/${job.chatId}`);
  };
  const surface =
    pill.tone === "error"
      ? "border-border-error bg-bg-error-subtle"
      : pill.tone === "attention"
        ? "border-[var(--color-border-warning)] bg-bg-warning-subtle"
        : "border-border bg-bg-surface";
  const lead = (
    <span
      className={cn(
        "inline-flex shrink-0",
        pill.tone === "working" && "text-[color:var(--color-icon-brand)] motion-safe:animate-spin",
        pill.tone === "done" && "text-[color:var(--color-icon-success)]",
        pill.tone === "error" && "text-[color:var(--color-icon-error)]",
        pill.tone === "attention" && "text-[color:var(--color-icon-warning)]",
      )}
    >
      <Icon icon={glyph} size={slot ? 20 : 16} />
    </span>
  );
  const dismiss = !pill.lasting && (
    <button
      type="button"
      onClick={() => dismissAttention(job.id)}
      aria-label="Dismiss"
      className={cn(
        "inline-flex size-[44px] shrink-0 items-center justify-center rounded-md text-[color:var(--color-icon-default)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        PRESSED,
        slot ? "mr-1" : "-ml-2",
      )}
    >
      <Icon icon={Cancel01Icon} size={16} />
    </button>
  );

  // Docked: a slim inset bar in the screen's flow, under its header — the whole bar opens the build.
  if (slot)
    return createPortal(
      <div role="status" aria-live="polite" className="px-8 pb-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal">
        <div className={cn("flex items-center overflow-hidden rounded-md border-[length:var(--border-width-1)] border-solid", surface)}>
          <button
            type="button"
            onClick={open}
            className={cn(
              "flex min-h-[44px] min-w-0 flex-1 items-center gap-6 py-1 pl-6 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
              PRESSED,
              pill.lasting ? "pr-4" : "pr-2",
            )}
          >
            {lead}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn(T.rowTitle, "truncate", ink)}>{pill.title}</span>
              {pill.detail && <span className={cn(T.meta, "line-clamp-2", pill.tone === "error" && ink)}>{pill.detail}</span>}
            </span>
            {pill.lasting && <Chevron />}
          </button>
          {dismiss}
        </div>
      </div>,
      slot,
    );
  // No slot: only the Feed (full-bleed clips, no Screen) floats it, under its header.
  if (pathname !== "/m") return null;
  return (
    // Under the sheets (z-overlay): an open sheet's scrim covers it, as it covers the screen.
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 z-overlay flex justify-center px-8",
        framed ? "top-[117px]" : "top-[calc(env(safe-area-inset-top)_+_64px)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-full items-center rounded-md border-[length:var(--border-width-1)] border-solid shadow-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal",
          surface,
        )}
      >
        <button
          type="button"
          onClick={open}
          className={cn(
            "flex min-h-[44px] min-w-0 items-center gap-4 rounded-md px-6 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            PRESSED,
          )}
        >
          {lead}
          <span className="flex min-w-0 flex-col">
            <span className={cn(T.meta, "truncate", ink)}>{pill.title}</span>
            {pill.detail && <span className={cn(T.meta, "truncate", ink)}>{pill.detail}</span>}
          </span>
        </button>
        {dismiss}
      </div>
    </div>
  );
}
