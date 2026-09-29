"use client";

// The one gate in front of every write that changes what buyers see (Phase 2
// spec §3.6.2, C8, P2-LISTING-13 as changed in §4.5).
//
// `guard(change, run)` asks `editGateOf` — the 100 % lock first, then the
// listing's own table:
// - free: `run` goes ahead at once;
// - confirm (a live Buy now listing): EditPauseDialog opens; "Pause and
//   continue" writes `pauseForEdit` first, then runs `run`. If the pause
//   can't be written, nothing runs and the dialog says why;
// - blocked (an auction) and locked (sold in full): nothing runs, and the
//   reason comes back for the control's `aria-describedby` — `reasonOf`
//   gives the same reason before the press, so the control can render
//   aria-disabled with it.
// Video takes and editor work don't come through here: they never pause.

import * as React from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, ModalFrame } from "@/components/ideeza";
import { editGateOf, projectLockOf } from "@/lib/manual/edit-gate";
import type { EditGate } from "@/lib/manual/p2-types";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { listingViewOf, pauseForEdit } from "@/lib/market/listing";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import type { ListingChange, ListingMetadata, MarketData } from "@/lib/market/types";
import { WRITE_ERROR_MESSAGE } from "@/lib/storage-status";
import { cn } from "@/lib/utils";

// The gate reads the listing's kind and the auction's phase only; the
// paused-diff `listingViewOf` also derives isn't used here.
const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };

// The listing gate needs only the id, so it holds even before the projects
// store has hydrated; the record adds its co-owners to the lock's arithmetic.
function gateFor(
  projectId: string | null,
  project: ManualProject | null,
  market: MarketData,
  now: number,
  change: ListingChange,
): EditGate {
  if (!projectId) return { kind: "free" };
  const listing = listingViewOf(projectId, {
    listings: market.listings,
    sales: market.sales,
    bids: market.bids,
    now,
    current: NO_METADATA,
  });
  const lock = projectLockOf(project ?? { id: projectId, createdAt: 0, contributors: [] }, market.sales);
  return editGateOf({ listing, lock }, change);
}

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

export type GuardOutcome =
  | { kind: "ran" }
  | { kind: "confirming" }
  | { kind: "refused"; reason: string };

export type ProjectEditGate = {
  /** The gate a write of `change` meets right now. */
  gateOf: (change: ListingChange) => EditGate;
  /** Why a write of `change` is refused (blocked or locked); null when it may go ahead. */
  reasonOf: (change: ListingChange) => string | null;
  guard: (change: ListingChange, run: () => void) => GuardOutcome;
  /** EditPauseDialog, wired. Render it once beside the control. */
  dialog: React.ReactNode;
};

export function useProjectEditGate(projectId: string | null | undefined): ProjectEditGate {
  const { projects } = useManualProjects();
  const { data, writeListings } = useMarket();
  const now = useMinuteClock();
  const id = projectId || null;
  const project = React.useMemo(() => (id ? (projects.find((p) => p.id === id) ?? null) : null), [projects, id]);
  const [pending, setPending] = React.useState<{ change: ListingChange; run: () => void } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const gateOf = React.useCallback(
    (change: ListingChange) => gateFor(id, project, data, now, change),
    [id, project, data, now],
  );
  const reasonOf = React.useCallback(
    (change: ListingChange) => {
      const g = gateOf(change);
      return g.kind === "blocked" || g.kind === "locked" ? g.reason : null;
    },
    [gateOf],
  );

  // A press reads the store as it is at that moment, not as the last render saw it.
  const guard = React.useCallback(
    (change: ListingChange, run: () => void): GuardOutcome => {
      const g = gateFor(id, project, readMarketNow(), Date.now(), change);
      if (g.kind === "free") {
        run();
        return { kind: "ran" };
      }
      if (g.kind === "confirm") {
        setError(null);
        setPending({ change, run });
        return { kind: "confirming" };
      }
      return { kind: "refused", reason: g.reason };
    },
    [id, project],
  );

  const cancel = React.useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  const proceed = React.useCallback(() => {
    if (!pending) return;
    const at = Date.now();
    const market = readMarketNow();
    const g = gateFor(id, project, market, at, pending.change);
    if (g.kind === "blocked" || g.kind === "locked") {
      setError(g.reason);
      return;
    }
    if (g.kind === "confirm") {
      const paused = pauseForEdit(market.listings, g.listingId, pending.change, at);
      if (!paused.ok) {
        setError(paused.reason);
        return;
      }
      if (!writeListings(paused.listings).ok) {
        setError(WRITE_ERROR_MESSAGE);
        return;
      }
    }
    const { run } = pending;
    setPending(null);
    setError(null);
    run();
  }, [pending, id, project, writeListings]);

  const dialog = <EditPauseDialog open={pending !== null} error={error} onCancel={cancel} onConfirm={proceed} />;
  return { gateOf, reasonOf, guard, dialog };
}

export type EditPauseDialogProps = {
  open: boolean;
  onCancel: () => void;
  /** Called only once the box is ticked. */
  onConfirm: () => void;
  /** Why the pause didn't go through; shown in the dialog, which stays open. */
  error?: string | null;
};

/** "Temporarily remove from the marketplace?" (P2-LISTING-13, Figma
 *  41505:153467): "Pause and continue" stays unavailable until the box is ticked. */
export function EditPauseDialog(props: EditPauseDialogProps) {
  if (!props.open) return null;
  return <EditPauseDialogOpen {...props} />;
}

function EditPauseDialogOpen({ onCancel, onConfirm, error }: EditPauseDialogProps) {
  const [ticked, setTicked] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const boxRef = React.useRef<HTMLButtonElement>(null);
  const hintId = React.useId();
  const tap = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open
      onClose={onCancel}
      size="sm"
      initialFocus={cancelRef}
      title={
        <span className="flex items-start gap-[8px]">
          <Icon icon={InformationCircleIcon} size={20} className="mt-[2px] shrink-0 text-[color:var(--color-text-blue)]" />
          <span>Temporarily remove from the marketplace?</span>
        </span>
      }
      footer={
        <div className="ml-auto flex flex-col items-end gap-[6px]">
          <div className="flex flex-wrap items-center justify-end gap-6">
            <Button ref={cancelRef} type="button" hierarchy="secondary" size="lg" className={tap} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              aria-disabled={!ticked || undefined}
              aria-describedby={ticked ? undefined : hintId}
              className={cn(tap, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
              onClick={() => {
                if (ticked) onConfirm();
                else boxRef.current?.focus();
              }}
            >
              Pause and continue
            </Button>
          </div>
          {!ticked && (
            <p id={hintId} className="text-sm text-text-secondary">
              Tick the box to continue.
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-[12px] text-sm leading-relaxed text-text-secondary">
        <p>
          Buyers see this project as it was listed. Changing it takes the listing off the marketplace until you
          relist it.
        </p>
        <Banner tone="attention">
          The listing is paused while you make changes. Relist it from the Marketplace block once every product has
          its video.
        </Banner>
        <button
          ref={boxRef}
          type="button"
          role="checkbox"
          aria-checked={ticked}
          onClick={() => setTicked((t) => !t)}
          className={cn(
            "flex min-h-[32px] items-center gap-[10px] self-start rounded-md px-[4px] text-left font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            tap,
          )}
        >
          <Checkbox checked={ticked} decorative />
          I understand the listing will be paused
        </button>
        {error && <Banner tone="error">{error}</Banner>}
      </div>
    </ModalFrame>
  );
}
