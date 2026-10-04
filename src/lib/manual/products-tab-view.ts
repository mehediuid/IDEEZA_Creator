// Pure view-model helpers for the project page's Products tab (spec §5.6,
// COR-22…25). Kept out of the client component so the counting and
// formatting rules are unit-tested directly, the way project-read.ts and
// project-summary.ts already are (§5.1).
//
// Everything here takes plain data — BuildItem[], ConceptPart[], a
// ResolvedSpec, an already-resolved ProductConfidence[] — never a BuildJob
// or a ManualProject, so a fixture is a few object literals, not a full
// store.
//
// Relative imports only (not "@/…"): this file is pulled into the
// node:test compile graph, whose tsc output doesn't rewrite path aliases
// (tests/projects/tsconfig.json — harness notes).

import type { BuildItem } from "../create/history";
import type { ConceptPart } from "../create/concept";
import type { ProductConfidence } from "../create/confidence";
import type { ResolvedSpec } from "../spec/types";
import { needsNoPower, replacedNotRecharged } from "../spec/facts";
import { radioOf } from "../spec/format";
import { batteryOf } from "../spec/batteries";
import { mm3, runtimeLabel } from "../spec/units";
import type { ProductVideoStatus } from "../video/types";
import { currentStage, type Activity } from "./journey";
import type { ProductReadiness } from "./p2-types";

/** "5 of 5 pieces ready" — every artifact that isn't `skipped` counts
 *  toward the total, and `ready` counts the ones that finished. The same
 *  rule review-outputs.tsx and chat-rail.tsx already use for one build. */
export type Pieces = { ready: number; total: number };

/** One product's own pieces, not a whole job's (project-read.ts's
 *  `piecesOf(job)` already owns that name for the job-wide count — plan
 *  amendment for C3). If C4's `productPiecesOf` lands in this tree first,
 *  the integrator swaps this for that instead. */
export function piecesOfItems(items: BuildItem[]): Pieces {
  const live = items.filter((i) => i.status !== "skipped");
  return {
    ready: live.filter((i) => i.status === "ready").length,
    total: live.length,
  };
}

/** COR-23's labelled facts — Size always, then whatever this product
 *  actually has. A fact that would only read "None" or "0 × 0" is left out
 *  rather than printed. */
export type ProductFact = {
  label: "Size" | "Board" | "Power" | "Radio";
  value: string;
};

export function productFacts(spec: ResolvedSpec, parts: ConceptPart[]): ProductFact[] {
  const facts: ProductFact[] = [{ label: "Size", value: mm3(spec.size) }];
  if (spec.board) {
    facts.push({
      label: "Board",
      value: `2-layer ${spec.board.w} × ${spec.board.h} mm`,
    });
  }
  if (!needsNoPower(spec)) {
    if (spec.battery === "none") {
      if (spec.drawMa > 0) facts.push({ label: "Power", value: "USB powered" });
    } else if (spec.battery === "adapter") {
      facts.push({ label: "Power", value: "Wall adapter" });
    } else {
      const runtime = runtimeLabel(spec.runtimeH);
      if (runtime) {
        const per = replacedNotRecharged(spec.battery) ? "per battery" : "per charge";
        facts.push({
          label: "Power",
          value: `${batteryOf(spec.battery).label} · ${runtime} ${per}`,
        });
      }
    }
  }
  const radio = radioOf(parts);
  if (radio) facts.push({ label: "Radio", value: radio });
  return facts;
}

/** COR-23 / LST-37: an unnamed product reads "Not named yet" everywhere
 *  its name is the visible label. */
export function displayProductName(name: string): string {
  return name.trim() ? name : "Not named yet";
}

/** COR-108: the dropped card's version line, in place of "v{n} · {date}". */
export function droppedNoteOf(current: number, lastIn: number): string {
  return `Not in version ${current} · from version ${lastIn}`;
}

/** One row per card (COR-42: the current version, plus products a later
 *  version dropped). `pieces` is null when there's nothing built to count
 *  (hand-made, build-gone, unmatched). */
export type HeadingRow = {
  dropped: boolean;
  version: number | null;
  pieces: Pieces | null;
};

/** COR-22's heading row: "{n} products · {ready} of {total} pieces ready
 *  [in version {v}]" — as raw numbers, not a string. `countLabel` and the
 *  "pieces ready" phrasing are the component's job (project-summary.ts's
 *  countLabel, per the harness note), so this stays testable without
 *  depending on that copy. Only the rows still in their current version
 *  count toward the pieces tally; "in version {v}" applies only when at
 *  least one listed row is dropped and every current row agrees on one
 *  version number — a project with several unrelated builds can disagree,
 *  and the suffix is then left off rather than guessed. */
export type ProductsHeading = {
  count: number;
  pieces: Pieces | null;
  version: number | null;
};

export function productsHeadingOf(rows: HeadingRow[]): ProductsHeading {
  const current = rows.filter((r) => !r.dropped && r.pieces);
  const pieces = current.length
    ? current.reduce(
        (acc, r) => ({
          ready: acc.ready + r.pieces!.ready,
          total: acc.total + r.pieces!.total,
        }),
        { ready: 0, total: 0 },
      )
    : null;
  const versions = new Set(
    current.map((r) => r.version).filter((v): v is number => v !== null),
  );
  const version =
    rows.some((r) => r.dropped) && versions.size === 1 ? [...versions][0] : null;
  return { count: rows.length, pieces, version };
}

/** COR-22's project headline, "Build check: {weakest tier}" — the worst
 *  tier across the products still in their current version (a dropped
 *  product's stale build isn't what "Build check" describes today), with
 *  every one of their issues and passes folded in so the disclosure this
 *  feeds (ConfidenceBadge, reused as-is by the component) still explains
 *  itself. Null when nothing in the list has ever been built — a fully
 *  hand-made project has no build to check, and the header says nothing
 *  rather than inventing a tier for it. */
export function headlineConfidenceOf(
  current: ProductConfidence[],
): ProductConfidence | null {
  if (!current.length) return null;
  return {
    productId: "__headline__",
    productName: "",
    tier: current.some((c) => c.tier === "draft") ? "draft" : "checked",
    // Products share sentences (a check not run reads the same for each), and
    // the panel keys rows by their text: one line per sentence.
    issues: uniqueBy(current.flatMap((c) => c.issues), (i) => i.text),
    passed: uniqueBy(current.flatMap((c) => c.passed), (t) => t),
  };
}

function uniqueBy<T>(list: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ───────────────────── Phase 2: the card's video line and stage pill ─────────────────────

/** P2-VIDEO-12: the card's one status line, P2-VIDEO-4's words. Text only, never a control. */
export function videoLineOf(status: ProductVideoStatus): string {
  switch (status.state) {
    case "none":
      return "No video yet";
    case "rendering":
      return `Rendering · ${Math.round(status.progress)} %`;
    case "ready":
      return "Video ready";
    case "failed":
      return "Render failed";
  }
}

/** P2-TABS-10's pill: "{short}", named "Stage: {label}" for a screen reader. */
export type StagePill = { short: string; ariaLabel: string };

export type ProductCardView = {
  /** P2-VIDEO-12: the owner's line on a current product; null on a dropped product and in a preview. */
  video: string | null;
  /** P2-TABS-10: the newest non-Others activity tagged to this product; null when there is none. */
  stage: StagePill | null;
};

/**
 * The Products tab's per-card Phase 2 facts, by row id (P2-VIDEO-12, P2-TABS-10). The video line
 * reads the page's own readiness (`view.videos.readiness.showcase.products`, the current
 * products only), so a dropped product has none; the stage reads the journey.
 */
export function productsTabView(
  view: { products: readonly { id: string }[]; videos: { readiness: { showcase: { products: readonly ProductReadiness[] } } } },
  ctx: { owner: boolean; activities: readonly Activity[] },
): Record<string, ProductCardView> {
  const videoOf = new Map(view.videos.readiness.showcase.products.map((p) => [p.productId, p.video]));
  const out: Record<string, ProductCardView> = {};
  for (const { id } of view.products) {
    const status = ctx.owner ? videoOf.get(id) : undefined;
    const stage = currentStage(ctx.activities, id);
    out[id] = {
      video: status ? videoLineOf(status) : null,
      stage: stage ? { short: stage.short, ariaLabel: `Stage: ${stage.label}` } : null,
    };
  }
  return out;
}
