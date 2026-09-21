"use client";

// BuildSimulator — the worker behind every build, mounted once beside
// the providers so it runs for the whole session.
//
// It renders nothing. It exists because a build is a background job: it
// has to keep advancing while the user is reading their chat, browsing
// projects or looking at a finished build's review screen. This logic
// used to live inside <BuildStatus />, which the build page unmounts the
// moment the job rolls up to "ready" — so the next build in the queue
// was never promoted and nothing progressed unless a build page happened
// to be open.
//
// It owns, for every build in the store:
//   • the tick that advances each running build's artifacts,
//   • promotion of the oldest queued build once the worker is free,
//   • the credit charge when a build actually starts (and parking it
//     back in the queue when the balance can't cover it),
//   • the refund after a system failure,
//   • the dev-only failure hooks.
//
// When a real backend lands, replace the tick with a subscription to
// `/api/build/:id` — the queue, credit and refund rules stay here.

import * as React from "react";
import {
  isWorkingBuild,
  productsOf,
  useCreateHistory,
  type BuildItemKind,
  type BuildJob,
} from "@/lib/create/history";
import {
  BUILD_COST,
  openCharges,
  useCredits,
  type CreditEntry,
} from "@/lib/create/credits";

// Per-tick increment per item (synthetic; a real backend will push real
// progress). 6% / tick * 800ms ≈ 13s per fresh item — close enough to
// the manifest's estimate to feel cohesive without making the demo
// painful.
const TICK_MS = 800;
const TICK_PROGRESS = 6;
// A small stagger so the artifacts don't all finish on the same tick.
const PER_ITEM_JITTER: Record<BuildItemKind, number> = {
  "3d": 0,
  pcb: 1,
  code: 2,
  wiring: 3,
  parts: 4,
};

// Dev-only hooks so the failure states are reachable on demand. There is
// no random failure injection: a build that fails in front of a user has
// to be a real failure, not a demo.
type DevWindow = Window & {
  __ideezaFailBuild?: (buildId: string) => void;
  __ideezaFailItem?: (buildId: string, kind: BuildItemKind) => void;
};

// Oldest first — the queue is a queue.
function oldestQueued(builds: BuildJob[]): BuildJob | null {
  let next: BuildJob | null = null;
  for (const b of builds) {
    if (b.status !== "queued") continue;
    if (!next || b.createdAt < next.createdAt) next = b;
  }
  return next;
}

// Whether the ledger has ever put this build's credits back. Read with
// openCharges() it separates the two ways a build can have no open
// charge: the money came back, or it never left.
function refundedOnLedger(ledger: CreditEntry[], buildId: string): boolean {
  return ledger.some((e) => e.reason === "refund" && e.buildId === buildId);
}

export function BuildSimulator() {
  const {
    builds,
    hydrated,
    updateBuildItem,
    promoteQueued,
    markCharged,
    markRefunded,
    blockForCredits,
    failBuildSystem,
  } = useCreateHistory();
  const {
    charge,
    refund,
    balance,
    ledger,
    hydrated: creditsHydrated,
  } = useCredits();
  // Both stores hydrate in their own mount effect. Until the ledger has
  // read storage its balance is 0, so acting before then would park
  // every running build as unaffordable on page load.
  const ready = hydrated && creditsHydrated;
  // The rendered balance, not useCredits().canAfford(): that reads a ref
  // the provider refreshes in its OWN effect, and a provider's effects
  // run after its children's — so from here the ref is a render behind.
  const affordable = balance >= BUILD_COST;

  // The tick reads the latest builds without restarting the interval.
  const buildsRef = React.useRef(builds);
  React.useEffect(() => {
    buildsRef.current = builds;
  }, [builds]);

  // A build costs credits the moment it actually starts — a queued one
  // is charged when its turn comes, not when it's booked. A charge that
  // can't be covered does NOT leave the build running: it goes back in
  // the queue, flagged, so nothing is ever built unpaid.
  React.useEffect(() => {
    if (!ready) return;
    for (const b of builds) {
      if (!isWorkingBuild(b) || b.creditsCharged) continue;
      // The ledger is the evidence, not charge()'s return value: that
      // is computed inside a setState updater React may not run
      // eagerly, so it can answer false for a charge that did apply.
      if (openCharges(ledger, b.id) > 0) {
        markCharged(b.id);
        continue;
      }
      // Its turn came up but the balance can't cover it — back to the
      // queue, flagged, rather than building unpaid.
      if (!affordable) {
        blockForCredits(b.id);
        continue;
      }
      // Idempotent per open charge, so a re-run before the ledger has
      // re-rendered can't charge twice.
      charge(b.id);
    }
  }, [
    ready,
    affordable,
    builds,
    ledger,
    charge,
    markCharged,
    blockForCredits,
  ]);

  // A system failure puts the credits back — once, and only when the
  // ledger actually shows the money returned. The ledger is the evidence
  // here too, not `creditsCharged`: that flag is written a render after
  // the charge lands, so a build that died inside that window would
  // otherwise keep money it never got to spend.
  React.useEffect(() => {
    if (!ready) return;
    for (const b of builds) {
      if (b.failure !== "system" || b.creditsRefunded) continue;
      if (openCharges(ledger, b.id) > 0) {
        refund(b.id);
        continue;
      }
      // No open charge: either the refund is already on the ledger — so
      // the flag can be set and the page can say so — or nothing was
      // ever charged, and there is nothing to claim.
      if (refundedOnLedger(ledger, b.id)) markRefunded(b.id);
    }
  }, [ready, builds, ledger, refund, markRefunded]);

  // The tick is work, not decoration, so it is deliberately NOT gated on
  // prefers-reduced-motion — a build has to finish for everyone. The
  // only motion is the progress bar's CSS transition, which the
  // stylesheet already answers that preference with.
  React.useEffect(() => {
    if (!ready) return;
    const t = window.setInterval(() => {
      let running = false;
      // Advance every running build, not just one on screen — there may
      // be no build page open at all.
      for (const b of buildsRef.current) {
        if (!isWorkingBuild(b)) continue;
        running = true;
        // Every product's artifacts, not just the primary's: a
        // multi-product build (§4.4) is not finished until the companion
        // is, and a companion whose bar never moved would read as stuck.
        for (const product of productsOf(b)) {
          for (const item of product.items) {
            if (item.status !== "building") continue;
            const next = Math.min(
              100,
              item.progress + TICK_PROGRESS - PER_ITEM_JITTER[item.kind],
            );
            const patch =
              next >= 100
                ? { status: "ready" as const, progress: 100 }
                : { progress: next };
            updateBuildItem(b.id, item.kind, patch, product.id);
          }
        }
      }
      if (running) return;
      // The worker is free — start whoever has been waiting longest, as
      // long as the balance can cover it. Checking first keeps a build
      // the user can't pay for parked instead of promoting and
      // un-promoting it every tick.
      const next = oldestQueued(buildsRef.current);
      if (!next) return;
      // A build that has already paid (a partial build queued for a
      // single retry) owes nothing more, so an empty balance must not
      // park it — retrying a piece costs no extra credits.
      if (affordable || next.creditsCharged) promoteQueued();
      // Already parked for the same reason — don't re-issue the action
      // every tick, which is what kept re-rendering the provider and
      // rewriting localStorage while a credits-blocked build just sat
      // there.
      else if (next.blocked !== "credits") blockForCredits(next.id);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, [ready, affordable, updateBuildItem, promoteQueued, blockForCredits]);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as DevWindow;
    w.__ideezaFailBuild = (buildId: string) => {
      // Failure only. The refund effect above sees it on the next
      // render and puts the credits back, so the flag and the ledger
      // can't disagree.
      failBuildSystem(buildId);
    };
    w.__ideezaFailItem = (buildId: string, kind: BuildItemKind) => {
      updateBuildItem(buildId, kind, { status: "failed" });
    };
    return () => {
      delete w.__ideezaFailBuild;
      delete w.__ideezaFailItem;
    };
  }, [failBuildSystem, updateBuildItem]);

  return null;
}

