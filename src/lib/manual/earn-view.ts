// The Earn area's pure facts (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md,
// "Earn area"): who may open it, its document title, the Overview's "Ready to
// earn" rows and option cards with their gate badges, the Project NFT
// section's action pair, and which products the Editions section lists.
// Every fact is read off the page's one derivation (`projectView`, COR-74);
// nothing here derives project state of its own.
//
// Value imports are relative, so node:test loads the compiled module.

import type { StoredDraft } from "../brief/project-brief";
import type { EditionTrack } from "../market/types";
import { EARN_SECTION_LABEL, type EarnSection } from "./earn-route";
import type { Readiness, ReadinessRuleId } from "./p2-types";
import { can, roleOf, type CanContext, type Viewer } from "./permissions";
import type { ProjectProduct } from "./project-read";
import { nextAction, type ActionPair, type NextAction, type ProjectSummary } from "./project-summary";
import type { ManualProject } from "./projects";

/** The owner alone manages earning: every preview, buyer or contributor, reads the gate state. */
export function canOpenEarn(viewer: Viewer): boolean {
  return roleOf(viewer) === "owner";
}

/** "Project NFT · Earn · {project} · IDEEZA"; the overview is "Earn · {project} · IDEEZA". */
export function earnDocTitle(section: EarnSection, projectName: string): string {
  const lead = section === "overview" ? "Earn" : `${EARN_SECTION_LABEL[section]} · Earn`;
  return `${lead} · ${projectName} · IDEEZA`;
}

// ─────────────────────────── the Overview ───────────────────────────

export type ReadyRow = { id: ReadinessRuleId; label: string; ok: boolean; reason: string | null };

const READY_LABEL: Partial<Record<ReadinessRuleId, string>> = {
  minted: "Minted",
  videos: "Product videos",
  ownership: "Ownership",
};

/**
 * "Ready to earn": the Sell gate's rules in their table order (videos,
 * ownership) — the ones the project page's Earn button counts as "N of M
 * ready" (`earnButtonOf`), so its count is these first rows — then Minted.
 * Sell doesn't ask Minted itself, so that row is the Showcase gate's own
 * rule: the same `status !== "draft"` test, with its reason.
 */
export function readyRowsOf(readiness: { sell: Readiness; showcase: Readiness }): ReadyRow[] {
  const minted = readiness.showcase.rules.find((r) => r.id === "minted");
  return [...readiness.sell.rules, ...(minted ? [minted] : [])].flatMap((r) => {
    const label = READY_LABEL[r.id];
    return label ? [{ id: r.id, label, ok: r.ok, reason: r.reason }] : [];
  });
}

/** A section's gate badge: listing, minting and editions sign with the demo wallet; the rest need none. No KYC in P0. */
export type EarnGate = "wallet" | "none";

export const GATE_TEXT: Record<EarnGate, { label: string; meaning: string }> = {
  wallet: { label: "Wallet", meaning: "Needs the demo wallet" },
  none: { label: "No wallet", meaning: "No wallet needed" },
};

export type EarnOption = { section: EarnSection; title: string; body: string; gate: EarnGate };

/** The Overview's option cards, in the sub-navigation's order. Rights has no card: it is reached from the sub-navigation. */
export const EARN_OPTIONS: readonly EarnOption[] = [
  { section: "sell", title: "Sell the project", body: "Mint the Project NFT and list it at a fixed price or at auction.", gate: "wallet" },
  { section: "editions", title: "Sell editions", body: "Sell Physical and Virtual NFTs of each product.", gate: "wallet" },
  { section: "plan", title: "Business plan", body: "AI writes a seven-section plan you can edit and print.", gate: "none" },
  { section: "splits", title: "Splits", body: "Set who owns what share of the project.", gate: "none" },
  { section: "customers", title: "Customers", body: "See every sale and who bought it.", gate: "none" },
];

// ─────────────────────────── Project NFT ───────────────────────────

/**
 * The Project NFT section's pair: the header's `nextAction`, minus Review
 * version, which is engineering's and stays on the project page. A draft
 * with a version waiting therefore still gets its Brief entry here. Then the
 * header's own filter (PPL-6: absent, not disabled): a blocked listing start
 * still shows to the owner, aria-disabled with its reason.
 */
export function earnPairOf(
  p: ManualProject,
  s: ProjectSummary,
  brief: StoredDraft | null,
  viewer: Viewer,
  ctx: CanContext,
): ActionPair {
  const pair = nextAction(p, {
    status: s.status,
    brief,
    source: s.source,
    pending: null,
    listing: s.listing,
    creatorPct: s.ownership.maker,
    locked: s.lock !== null,
  });
  const allowed = (a: NextAction) => {
    switch (a.kind) {
      case "review-version":
        return false;
      case "add-to-marketplace":
        return a.blocked ? can(viewer, "facts.seeOwnerOnly") : can(viewer, "listing.create", ctx);
      default:
        return can(viewer, "project.brief", ctx);
    }
  };
  const first = pair.first && allowed(pair.first) ? pair.first : null;
  const second = first && pair.second && allowed(pair.second) ? pair.second : null;
  return { first, second, violet: pair.violet };
}

// ─────────────────────────── Editions ───────────────────────────

/** One row per current product, plus a dropped one that still has editions — the same set the
 *  Marketplace block's Physical and Virtual summaries read (edition-summary.tsx). */
export function editionProductsOf(products: readonly ProjectProduct[], editions: readonly EditionTrack[]): ProjectProduct[] {
  return products.filter((p) => p.dropped === null || editions.some((t) => t.productId === p.id));
}
