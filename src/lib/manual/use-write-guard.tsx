"use client";

// The guard API for React (Build and Earn P1-1): the one gate in front of
// every write that changes what buyers see (Phase 2 spec §3.6.2, C8,
// P2-LISTING-13 as changed in §4.5), over the registered guards
// (./guards.ts) instead of the market. Commerce registers them at the app
// root, so nothing here knows what a listing or a sale is.
//
// `guard(change, run)` asks the guards for their strongest verdict:
// - free: `run` goes ahead at once;
// - confirm: the confirming guard's dialog opens; agreeing runs the guard's
//   own step first (the listing's pause), then `run`, handing it the step's
//   undo. If the step fails, nothing runs and the dialog says why;
// - blocked and locked: nothing runs, and the reason comes back for the
//   control's `aria-describedby` — `reasonOf` gives the same reason before
//   the press, so the control can render aria-disabled with it.
// Video takes and editor work don't come through here: they never pause.
//
// `useGuards()` is the same registry for a list: which projects are locked
// for good (the choosers that leave them out), whether the guards have read
// their records yet, and whether they could.

import * as React from "react";
import {
  decideWrite,
  guardsSnapshot,
  guardsUnreadable,
  lockOf,
  NO_UNDO,
  SERVER_GUARDS,
  subscribeGuards,
  writeGuardsNow,
  type GuardConfirmProps,
  type GuardProject,
  type LockedVerdict,
  type Undo,
  type WriteChange,
  type WriteVerdict,
} from "./guards";
import { useManualProjects } from "./projects";

const MINUTE = 60_000;

/** The wall clock to the minute, so an auction that ends while the page is
 *  open moves its reason from "running" to "close it first" on its own. */
function useMinuteClock(): number {
  const subscribe = React.useCallback((onChange: () => void) => {
    const timer = window.setInterval(onChange, MINUTE);
    return () => window.clearInterval(timer);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

function useGuardsSnapshot() {
  return React.useSyncExternalStore(subscribeGuards, guardsSnapshot, () => SERVER_GUARDS);
}

export type Guards = {
  /** False until the guards have read their records in this browser (the server and
   *  hydration's render): a gate shows its loading state meanwhile. */
  ready: boolean;
  /** A guard's records are present but can't be read, so it can't tell whether a write is safe. */
  unreadable: boolean;
  /** The lock on `project` — read-only for good — or null. */
  lockOf: (project: GuardProject) => LockedVerdict | null;
};

export function useGuards(): Guards {
  const snap = useGuardsSnapshot();
  return React.useMemo(
    () => ({
      ready: snap !== SERVER_GUARDS,
      unreadable: snap !== SERVER_GUARDS && guardsUnreadable(),
      lockOf: (project: GuardProject) => lockOf(project),
    }),
    [snap],
  );
}

export type GuardOutcome =
  | { kind: "ran" }
  | { kind: "confirming" }
  | { kind: "refused"; reason: string };

export type WriteGuardHandle = {
  /** The gate a write of `change` meets right now. */
  gateOf: (change: WriteChange) => WriteVerdict;
  /** Why a write of `change` is refused (blocked or locked); null when it may go ahead. */
  reasonOf: (change: WriteChange) => string | null;
  /** `run` gets the undo of the step a confirm ran first (a no-op when none ran), for a write
   *  that is then refused. */
  guard: (change: WriteChange, run: (undo: Undo) => void) => GuardOutcome;
  /** The confirming guard's dialog, wired. Render it once beside the control. */
  dialog: React.ReactNode;
  /** The confirming guard's dialog is open: a dialog under it hands it the keyboard. */
  confirming: boolean;
  ready: boolean;
  unreadable: boolean;
};

function NoDialog(props: GuardConfirmProps) {
  void props;
  return null;
}

export function useWriteGuard(projectId: string | null | undefined): WriteGuardHandle {
  const { projects } = useManualProjects();
  const snap = useGuardsSnapshot();
  const now = useMinuteClock();
  const id = projectId || null;
  // The listing gate needs only the id, so it holds even before the projects
  // store has hydrated; the record adds its co-owners to the lock's arithmetic.
  const project = React.useMemo<GuardProject | null>(() => {
    if (!id) return null;
    return projects.find((p) => p.id === id) ?? { id, createdAt: 0, contributors: [] };
  }, [projects, id]);
  const [pending, setPending] = React.useState<{ change: WriteChange; run: (undo: Undo) => void; guardId: string } | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const gateOf = React.useCallback(
    (change: WriteChange): WriteVerdict => {
      void snap;
      return project ? decideWrite(project, change, now).verdict : { kind: "free" };
    },
    [project, now, snap],
  );
  const reasonOf = React.useCallback(
    (change: WriteChange) => {
      const g = gateOf(change);
      return g.kind === "blocked" || g.kind === "locked" ? g.reason : null;
    },
    [gateOf],
  );

  // A press reads the guards as they are at that moment, not as the last render saw them.
  const guard = React.useCallback(
    (change: WriteChange, run: (undo: Undo) => void): GuardOutcome => {
      if (!project) {
        run(NO_UNDO);
        return { kind: "ran" };
      }
      const { verdict, guard: by } = decideWrite(project, change, Date.now());
      if (verdict.kind === "free") {
        run(NO_UNDO);
        return { kind: "ran" };
      }
      if (verdict.kind === "confirm") {
        setError(null);
        setPending({ change, run, guardId: by?.id ?? "" });
        return { kind: "confirming" };
      }
      return { kind: "refused", reason: verdict.reason };
    },
    [project],
  );

  const cancel = React.useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  const proceed = React.useCallback(() => {
    if (!pending || !project) return;
    const at = Date.now();
    const { verdict, guard: by } = decideWrite(project, pending.change, at);
    if (verdict.kind === "blocked" || verdict.kind === "locked") {
      setError(verdict.reason);
      return;
    }
    let undo = NO_UNDO;
    if (verdict.kind === "confirm" && by?.confirm) {
      const step = by.confirm(project, pending.change, at);
      if (!step.ok) {
        setError(step.reason);
        return;
      }
      undo = step.undo;
    }
    const { run } = pending;
    setPending(null);
    setError(null);
    run(undo);
  }, [pending, project]);

  const Confirm =
    writeGuardsNow().find((g) => g.id === pending?.guardId)?.Confirm ?? writeGuardsNow().find((g) => g.Confirm)?.Confirm ?? NoDialog;
  const dialog = <Confirm open={pending !== null} error={error} onCancel={cancel} onConfirm={proceed} />;
  return {
    gateOf,
    reasonOf,
    guard,
    dialog,
    confirming: pending !== null,
    ready: snap !== SERVER_GUARDS,
    unreadable: snap !== SERVER_GUARDS && guardsUnreadable(),
  };
}
