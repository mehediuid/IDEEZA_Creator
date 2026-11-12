"use client";

// The edit gate on the phone (Figma 21 · "Temporarily remove from the
// marketplace?"): the web's write guards decide (lib/manual/guards.ts —
// commerce registers them at the app root), and this draws their confirm as
// the phone's sheet instead of the web dialog. A live Buy-now listing asks to
// pause first, with the box to tick before "Pause and continue"; an auction
// or the 100 % lock refuses, with the reason. The words are the web's, but
// the relist hint names Earn › Sell, where a phone relists (owner decision on
// row 21).

import * as React from "react";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { decideWrite, NO_UNDO, writeGuardsNow, type Undo, type WriteChange } from "@/lib/manual/guards";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { T } from "../type";

export type GateOutcome = { kind: "ran" } | { kind: "confirming" } | { kind: "refused"; reason: string };

export type PhoneWriteGate = {
  /** Why a write of `change` is refused right now (an auction, the lock); null when it may go ahead. */
  reasonOf: (change: WriteChange) => string | null;
  guard: (change: WriteChange, run: (undo: Undo) => void) => GateOutcome;
  /** The pause sheet; render it once. */
  sheet: React.ReactNode;
};

export function usePhoneWriteGate(projectId: string): PhoneWriteGate {
  const { projects } = useManualProjects();
  const project = React.useMemo(
    () => projects.find((p) => p.id === projectId) ?? { id: projectId, createdAt: 0, contributors: [] },
    [projects, projectId],
  );
  const [pending, setPending] = React.useState<{ change: WriteChange; run: (undo: Undo) => void; guardId: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reasonOf = (change: WriteChange) => {
    const v = decideWrite(project, change, Date.now()).verdict;
    return v.kind === "blocked" || v.kind === "locked" ? v.reason : null;
  };

  const guard = (change: WriteChange, run: (undo: Undo) => void): GateOutcome => {
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
  };

  const proceed = () => {
    if (!pending) return;
    const at = Date.now();
    const { verdict, guard: by } = decideWrite(project, pending.change, at);
    if (verdict.kind === "blocked" || verdict.kind === "locked") return setError(verdict.reason);
    let undo = NO_UNDO;
    if (verdict.kind === "confirm") {
      const confirm = (by ?? writeGuardsNow().find((g) => g.id === pending.guardId))?.confirm;
      if (confirm) {
        const step = confirm(project, pending.change, at);
        if (!step.ok) return setError(step.reason);
        undo = step.undo;
      }
    }
    const { run } = pending;
    setPending(null);
    setError(null);
    run(undo);
  };

  const sheet = (
    <PauseSheet
      open={pending !== null}
      error={error}
      onCancel={() => {
        setPending(null);
        setError(null);
      }}
      onConfirm={proceed}
    />
  );
  return { reasonOf, guard, sheet };
}

function PauseSheet({ open, error, onCancel, onConfirm }: { open: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }) {
  const [ticked, setTicked] = React.useState(false);
  const close = () => {
    setTicked(false);
    onCancel();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Temporarily remove from the marketplace?"
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            disabled={!ticked}
            onClick={() => {
              setTicked(false);
              onConfirm();
            }}
          >
            Pause and continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
          {!ticked && <p className={cn(T.meta, "text-right")}>Tick the box to continue.</p>}
        </>
      }
    >
      <p className={T.body}>
        The marketplace shows this project as it was listed. Changing it takes the listing off the marketplace until you relist it.
      </p>
      <Banner tone="attention">
        The listing is paused while you make changes. Relist it in Earn › Sell once every product has its AI video and the project video is made.
      </Banner>
      <label className={cn(T.rowTitle, "relative flex min-h-[44px] cursor-pointer items-center gap-4")}>
        <input type="checkbox" className="sr-only" checked={ticked} onChange={() => setTicked((t) => !t)} />
        <Checkbox checked={ticked} decorative />
        I understand the listing will be paused
      </label>
      {error && (
        <p role="alert" className={cn(T.body, "text-text-error")}>
          {error}
        </p>
      )}
    </Sheet>
  );
}
