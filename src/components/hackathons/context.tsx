"use client";

// One provider for the hackathon page: the clock (ticks each second on the
// client, null under SSR so nothing mismatches), the phase it puts the event
// in, the account's entry (joined / votes), the standings with this account's
// votes counted in (one board for every section, so no two numbers disagree),
// and the two dialogs every section can open — Join and a showcased project.

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEntry } from "@/components/auth/use-entry";
import { useHackathonEntry } from "@/lib/hackathons/entry";
import { HACKATHON, groupStandings, phaseAt, standings, type GroupRow, type Phase, type Row } from "@/lib/hackathons/vibe-inventing";
import { JoinDialog } from "./join-dialog";
import { ProjectDialog } from "./project-dialog";

type Ctx = {
  now: number | null;
  phase: Phase | null;
  entry: ReturnType<typeof useHackathonEntry>;
  /** Signed out: the way in (Sign up / Sign in) that comes back here to join. */
  joinHref: string;
  /** Signed out: the way in that comes back to the products to vote. */
  voteHref: string;
  /** Every participant, best first. */
  board: Row[];
  /** The group ranking (empty when the hackathon has no groups). */
  groups: GroupRow[];
  openJoin: () => void;
  openProject: (r: Row) => void;
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
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const board = React.useMemo(() => standings(entry.votes), [entry.votes]);
  const groups = React.useMemo(() => groupStandings(board), [board]);
  // The open project is read from the board, so its votes and rank follow a vote cast in the dialog.
  const project = projectId ? (board.find((r) => r.p.id === projectId) ?? null) : null;
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
    voteHref: into("/hackathons#vote"),
    board,
    groups,
    openJoin: () => setJoinOpen(true),
    openProject: (r) => setProjectId(r.p.id),
  };

  return (
    <HackathonCtx.Provider value={value}>
      {children}
      <div ref={setLayer} data-theme="dark" />
      <JoinDialog open={joinOpen || autoJoin} onClose={closeJoin} container={layer} />
      <ProjectDialog row={project} onClose={() => setProjectId(null)} container={layer} />
    </HackathonCtx.Provider>
  );
}

export const canJoin = (phase: Phase | null) => phase === "registration" || phase === "live";
export const canVote = (phase: Phase | null) => phase === "live";

/** Days, hours, minutes and seconds to `to`, two digits each ("--" before the clock has started). */
export function countdownParts(to: number, now: number | null): { d: string; h: string; m: string; s: string } {
  if (now === null) return { d: "--", h: "--", m: "--", s: "--" };
  let s = Math.max(0, Math.floor((to - now) / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  const d = Math.floor(s / 86400);
  s %= 86400;
  return { d: p(d), h: p(Math.floor(s / 3600)), m: p(Math.floor((s % 3600) / 60)), s: p(s % 60) };
}

// Reduced motion, read live: product videos only play when motion is welcome.
function subscribeMotion(on: () => void) {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", on);
  return () => q.removeEventListener("change", on);
}
export function useReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
}

/** "16 Nov, 09:00" in the hackathon's own time zone. */
export function eat(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: HACKATHON.timeZone });
}
