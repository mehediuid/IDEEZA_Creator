"use client";

// One provider for the hackathon page: the clock (ticks each second on the
// client, null under SSR so nothing mismatches), the phase it puts the event
// in, the account's entry (joined / votes), and the two dialogs every section
// can open — Join and a showcased project.

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEntry } from "@/components/auth/use-entry";
import { useHackathonEntry } from "@/lib/hackathons/entry";
import { phaseAt, type Participant, type Phase } from "@/lib/hackathons/vibe-inventing";
import { JoinDialog } from "./join-dialog";
import { ProjectDialog } from "./project-dialog";

type Ctx = {
  now: number | null;
  phase: Phase | null;
  entry: ReturnType<typeof useHackathonEntry>;
  /** Signed out: the way in (Sign up / Sign in) that comes back here to join. */
  joinHref: string;
  /** Signed out: the way in that comes back to the leaderboard to vote. */
  voteHref: string;
  openJoin: () => void;
  openProject: (p: Participant, rank: number) => void;
};

const HackathonCtx = React.createContext<Ctx | null>(null);

// The page clock: one tick a second, read the same way during a render.
function subscribeClock(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}
const clockNow = () => Math.floor(Date.now() / 1000) * 1000;

export function useHackathon(): Ctx {
  const c = React.useContext(HackathonCtx);
  if (!c) throw new Error("useHackathon outside HackathonProvider");
  return c;
}

export function HackathonProvider({ children }: { children: React.ReactNode }) {
  const now = React.useSyncExternalStore(subscribeClock, clockNow, () => null);
  const phase = now === null ? null : phaseAt(now);
  const entry = useHackathonEntry();
  const { into } = useEntry();
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [project, setProject] = React.useState<{ p: Participant; rank: number } | null>(null);
  // The dialogs mount here, inside the page's dark theme (a portal to <body> would take the app's theme).
  const [layer, setLayer] = React.useState<HTMLDivElement | null>(null);

  // Back from Sign up / Sign in with ?join=1: the join step is open until it
  // is closed, which also clears the address.
  const params = useSearchParams();
  const router = useRouter();
  const backToJoin = params.get("join") === "1";
  const autoJoin = backToJoin && entry.ready && entry.signedIn && !entry.joined;
  const closeJoin = () => {
    setJoinOpen(false);
    if (backToJoin) router.replace("/hackathons", { scroll: false });
  };

  const value: Ctx = {
    now,
    phase,
    entry,
    joinHref: into("/hackathons?join=1"),
    voteHref: into("/hackathons#leaderboard"),
    openJoin: () => setJoinOpen(true),
    openProject: (p, rank) => setProject({ p, rank }),
  };

  return (
    <HackathonCtx.Provider value={value}>
      {children}
      <div ref={setLayer} data-theme="dark" />
      <JoinDialog open={joinOpen || autoJoin} onClose={closeJoin} container={layer} />
      <ProjectDialog item={project} onClose={() => setProject(null)} container={layer} />
    </HackathonCtx.Provider>
  );
}

export const canJoin = (phase: Phase | null) => phase === "registration" || phase === "live";
export const canVote = (phase: Phase | null) => phase === "live";

/** "2d 15:59:45", or "—" before the clock has started. */
export function countdown(to: number, now: number | null): string {
  if (now === null) return "—";
  let s = Math.max(0, Math.floor((to - now) / 1000));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d}d ${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** "16 Nov, 09:00" in the event's time zone (EAT). */
export function eat(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
}
